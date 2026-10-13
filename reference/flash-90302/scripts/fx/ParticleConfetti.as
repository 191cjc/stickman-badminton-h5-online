package fx
{
   import bobby.§ null§;
   import bobby.§_-0v§;
   import bobby.§_-2W§;
   import bobby.§_-3e§;
   import bobby.classes.RGB;
   import flash.display.MovieClip;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol282")]
   public class ParticleConfetti extends § null§
   {
      
      public var body:MovieClip;
      
      private var dx:Number = 0;
      
      private var dy:Number = 0;
      
      public function ParticleConfetti()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         this.dx = §_-3e§.§ else§(1,4);
         this.dy = §_-3e§.§ else§(3,6);
         §_-0v§.§_-6-§(this.handleEnterFrame);
         var _loc2_:RGB = new RGB(§_-3e§.§ else§(0,256,true),§_-3e§.§ else§(0,256,true),§_-3e§.§ else§(0,256,true));
         §_-2W§.§default§(MovieClip(this.body.body),_loc2_.getUint());
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         y += this.dy * 30 * param1;
         x += this.dx * 30 * param1;
         if(§_-3e§.§_-3M§(1.6666))
         {
            this.dx = §_-3e§.§ else§(1,4);
            if(§_-3e§.§_-3M§(50))
            {
               this.dx *= -1;
            }
         }
         if(y + height / 2 > stage.stageHeight)
         {
            remove();
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         §_-0v§.§ do§(this.handleEnterFrame);
      }
   }
}

