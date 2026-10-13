package bobby.classes
{
   import bobby.§ null§;
   import bobby.§_-0v§;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.utils.setTimeout;
   
   public class TransitionBase extends § null§
   {
      
      private var dead:Boolean = false;
      
      private var fading:Boolean = false;
      
      private var fadeInTime:Number;
      
      private var fadeOutTime:Number;
      
      private var fadeOutDelay:Number;
      
      public function TransitionBase(param1:Number, param2:Number, param3:Number)
      {
         super();
         this.fadeInTime = param1;
         this.fadeOutTime = param2;
         this.fadeOutDelay = param3;
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         §_-0v§.§_-6-§(this.handleEnterFrame);
         alpha = 0;
         var _loc2_:Sprite = new Sprite();
         addChild(_loc2_);
         _loc2_.graphics.beginFill(0);
         _loc2_.graphics.drawRect(0,0,stage.stageWidth,stage.stageHeight);
         _loc2_.graphics.endFill();
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         var dt:Number = param1;
         super.handleEnterFrame(dt);
         if(!this.fading)
         {
            alpha += 1 / this.fadeInTime * dt;
            if(alpha > 0.99 && !this.dead)
            {
               alpha = 1;
               this.dead = true;
               setTimeout(function():*
               {
                  fading = true;
                  doSomething();
               },this.fadeOutDelay * 1000);
            }
         }
         else
         {
            alpha -= 1 / this.fadeOutTime * dt;
            if(alpha < 0.01)
            {
               this.fading = false;
               remove();
            }
         }
      }
      
      public function doSomething() : void
      {
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         §_-0v§.§ do§(this.handleEnterFrame);
      }
   }
}

