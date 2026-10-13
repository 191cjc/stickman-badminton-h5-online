package §_-2g§
{
   import bobby.§ null§;
   import bobby.§_-0v§;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol435")]
   public class §_-1d§ extends § null§
   {
      
      private var dead:Boolean = false;
      
      public var targetX:Number = 300;
      
      public var speed:Number = 400;
      
      private var §do §:Boolean = true;
      
      public function §_-1d§()
      {
         addFrameScript(0,this.frame1);
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         §_-0v§.§_-6-§(this.handleEnterFrame);
      }
      
      public function § case§() : void
      {
         this.dead = true;
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(!this.dead)
         {
            if(this.targetX > x)
            {
               x += this.speed * param1;
               if(x >= this.targetX)
               {
                  x = this.targetX;
                  this.§do § = true;
               }
            }
            else if(x > this.targetX)
            {
               x -= this.speed * param1;
               if(x <= this.targetX)
               {
                  x = this.targetX;
                  this.§do § = false;
               }
            }
         }
         else if(this.§do §)
         {
            x -= this.speed * param1;
            if(x < -300)
            {
               remove();
            }
         }
         else
         {
            x += this.speed * param1;
            if(x > stage.stageWidth + 300)
            {
               remove();
            }
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         §_-0v§.§ do§(this.handleEnterFrame);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

